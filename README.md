# CardGuard AI 🛡️

> AI-Powered Smart Contract Security Auditor for Cardano

Built for **IndiaCodex'26** | General Track

---

## What It Does

CardGuard AI scans Cardano smart contracts for vulnerabilities, generates risk scores, and provides actionable security recommendations — all in seconds.

### Features

- **🔍 AI-Powered Analysis** — Scans code for 16+ vulnerability patterns
- **📊 Risk Scoring** — 0-100 score with severity breakdowns (Critical/High/Medium/Low/Info)
- **⛓️ On-Chain Storage** — Audit reports stored on Cardano via Blockfrost API
- **📝 Multi-Language** — Supports Plutus, Aiken, Marlowe, and Solidity
- **📥 Export Reports** — Download audit results as JSON
- **🎨 Beautiful UI** — Dark theme with Cardano branding

### Vulnerability Checks

| Category | Examples |
|----------|----------|
| Critical | Unsafe operations, unsafe module imports |
| High | Insecure signature verification, partial functions, unsafe I/O |
| Medium | Debug traces, hardcoded values, unsafe data conversion |
| Low | Error tracing, constant conditionals |
| Info | Validator patterns, success traces |

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes
- **Blockchain:** Cardano (Blockfrost API)
- **Smart Contract:** Aiken (Plutus-based validator)

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set your Blockfrost API key for on-chain audit storage (optional):

```
BLOCKFROST_API_KEY=your_api_key_here
```

Get a free key at [blockfrost.io](https://blockfrost.io)

---

## Project Structure

```
cardguard-ai/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── audit/page.tsx    # Audit editor + results
│   │   ├── api/scan/route.ts # Scan API endpoint
│   │   └── layout.tsx        # Root layout with Navbar
│   ├── components/
│   │   └── Navbar.tsx        # Navigation bar
│   └── lib/
│       ├── scanner.ts        # Vulnerability scanner engine
│       └── cardano.ts        # Cardano blockchain integration
├── contracts/
│   └── cardguard_validator.ak  # Aiken smart contract
├── .env.example
└── README.md
```

---

## How It Works

1. **User pastes smart contract code** in the editor
2. **Scanner analyzes the code** against 16+ known vulnerability patterns
3. **Risk score is calculated** based on severity and count of issues
4. **Detailed report** shows each finding with line numbers, code snippets, and fix recommendations
5. **(Optional)** Audit hash is stored on-chain via Blockfrost for immutable proof

---

## Smart Contract

The `cardguard_validator.ak` Aiken contract enables on-chain audit storage. It validates:
- Audit metadata exists in transaction
- Audit hashes match expected format
- Only authorized auditors can store records

---

## Team

Built with ❤️ for IndiaCodex'26

---

## License

MIT
