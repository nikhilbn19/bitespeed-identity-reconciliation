import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Either email or phoneNumber must be provided",
      });
    }

    const matchedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (matchedContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
        },
      });

      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    const allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: matchedContacts.map((c) => c.id) } },
          { linkedId: { in: matchedContacts.map((c) => c.id) } },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const primaryContacts = allRelatedContacts.filter(
      (c) => c.linkPrecedence === "primary",
    );

    primaryContacts.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const oldestPrimary = primaryContacts[0];

    if (primaryContacts.length > 1) {
      for (let i = 1; i < primaryContacts.length; i++) {
        await prisma.contact.update({
          where: { id: primaryContacts[i].id },
          data: {
            linkPrecedence: "secondary",
            linkedId: oldestPrimary.id,
          },
        });
      }
    }

    const finalPrimaryId = oldestPrimary.linkedId ?? oldestPrimary.id;

    const finalContacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: finalPrimaryId }, { linkedId: finalPrimaryId }],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const existingEmails = new Set(
      finalContacts.map((c) => c.email).filter(Boolean),
    );

    const existingPhones = new Set(
      finalContacts.map((c) => c.phoneNumber).filter(Boolean),
    );

    const isNewEmail = email && !existingEmails.has(email);
    const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

    if (isNewEmail || isNewPhone) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkedId: finalPrimaryId,
          linkPrecedence: "secondary",
        },
      });
    }

    const updatedContacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: finalPrimaryId }, { linkedId: finalPrimaryId }],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const emails = [
      ...new Set(updatedContacts.map((c) => c.email).filter(Boolean)),
    ] as string[];

    const phoneNumbers = [
      ...new Set(updatedContacts.map((c) => c.phoneNumber).filter(Boolean)),
    ] as string[];

    const secondaryContactIds = updatedContacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id);

    return res.status(200).json({
      contact: {
        primaryContactId: finalPrimaryId,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
