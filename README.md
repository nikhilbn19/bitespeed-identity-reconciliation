# Bitespeed Backend Task — Identity Reconciliation

##  Problem Statement

Customers may place multiple orders using different email addresses and phone numbers.

The goal of this service is to identify and link contacts that belong to the same person based on shared email or phoneNumber, and return a consolidated contact response.

This project implements the required /identify endpoint as specified in the Bitespeed backend assignment.

---

## Tech Stack

This project is built using:

- **Node.js** — Runtime environment
- **TypeScript** — Type safety and maintainability
- **Express.js** — REST API framework
- **Prisma (v5)** — ORM for database management
- **PostgreSQL** — Relational SQL database

---

## Database Schema

The system uses a relational **Contact** table with the following fields:

- `id` (Int, auto-increment)
- `email` (String, optional)
- `phoneNumber` (String, optional)
- `linkedId` (Int, nullable)
- `linkPrecedence` ("primary" | "secondary")
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable)

### Relationship Logic

- The **oldest contact** in a linked group is marked as `primary`.
- All other related contacts are marked as `secondary`.
- Secondary contacts reference the primary contact using `linkedId`.
- Contacts are linked if they share either the same email or phoneNumber.

## Identity Reconciliation Rules

The service follows these rules:

1. **New Contact**
   - If no existing contact matches the provided email or phoneNumber,
     a new contact is created as `primary`.

2. **Existing Contact Lookup**
   - If either email or phoneNumber matches an existing contact,
     all related contacts are fetched and consolidated.

3. **Secondary Contact Creation**
   - If the request introduces new information (new email or phoneNumber),
     a new contact is created as `secondary` and linked to the primary contact.

4. **Primary Merge Handling**
   - If two independent primary contacts become connected through a request:
     - The **oldest contact remains primary**.
     - The newer primary is converted into a secondary.
     - Its `linkedId` is updated to reference the oldest primary.

5. **Deduplication**
   - Emails and phone numbers are deduplicated in the response.

   ## API Specification

### Endpoint

POST /identify

### Request Body (JSON)

{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}

At least one of `email` or `phoneNumber` must be provided.

---

### Success Response (200)

{
  "contact": {
    "primaryContactId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}

---

###  Error Response (400)

{
  "error": "Either email or phoneNumber must be provided"
}

## Edge Cases Handled

The service correctly handles the following scenarios:

- Lookup using only email
- Lookup using only phoneNumber
- Creation of secondary contact when new information appears
- Prevention of duplicate contacts
- Merging of two primary contacts
- Preservation of the oldest contact as primary
- Deduplication of emails and phone numbers in the response
- Validation when both email and phoneNumber are missing

## Running Locally

### 1️ Clone the repository

git clone <your-repo-url>
cd bitespeed-identity-reconciliation

---

### 2️ Install dependencies

npm install

---

### 3️ Configure environment variables

Create a `.env` file in the root directory:

DATABASE_URL="postgresql://username:password@localhost:5432/bitespeed"
PORT=3000

---

### 4️ Run database migrations

npx prisma migrate dev

---

### 5️ Start development server

npm run dev

Server will run at:

http://localhost:3000

##  Production Build

To build and run the project in production mode:

npm run build
npm start

---

##  Hosted Endpoint

After deployment, the live API endpoint will be available at:

https://bitespeed-api-x9yx.onrender.com/identify

---

##  Evaluation Checklist

- SQL database used (PostgreSQL)
- Node.js + TypeScript implementation
- Prisma ORM with self-referencing relation
- `/identify` endpoint implemented
- Primary contact creation
- Secondary contact creation
- Primary-to-primary merge handling
- Oldest primary preservation rule
- JSON request body only
- Publicly hosted endpoint

---


