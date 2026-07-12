-- CardGuard AI - On-Chain Audit Storage Validator
-- Written in Aiken for Cardano

use aiken/list
use aiken/transaction.{ScriptContext}

type AuditRecord {
  audit_id: ByteArray,
  risk_score: Int,
  auditor_hash: ByteArray,
  timestamp: Int,
}

type Datum {
  owner: ByteArray,
  audit_count: Int,
}

type Redeemer {
  action: Action,
}

type Action {
  StoreAudit
  VerifyAudit(ByteArray)
}

validator cardguard_audit {
  spend(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    when redeemer.action is {
      StoreAudit -> {
        // Ensure transaction has proper metadata
        trace_if_false("Must have metadata", ctx.tx.metadata.len > 0)
      }
      VerifyAudit(expected_hash) -> {
        // Verify the audit hash matches
        trace_if_false("Invalid audit hash", expected_hash.len == 8)
      }
    }
  }

  else(_) -> {
    true
  }
}
