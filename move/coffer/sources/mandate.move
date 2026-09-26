module coffer::mandate;

use coffer::treasury::{Self, Treasury, TreasuryAdminCap};

const EAgentCapMismatch: u64 = 1;
const ETreasuryMismatch: u64 = 2;
const EAgentMismatch: u64 = 3;
const EMandateInactive: u64 = 4;
const EPerPaymentLimitExceeded: u64 = 5;
const EPeriodLimitExceeded: u64 = 6;
const EPolicyVersionMismatch: u64 = 7;

#[allow(unused_field)]
public struct AgentMandate has key {
    id: UID,
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    period_spent: u64,
    period_started_at_ms: u64,
    period_duration_ms: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    approval_threshold: u64,
    max_rebalance: u64,
    policy_version: u64,
    revoked: bool,
}

public struct AgentCap has key, store {
    id: UID,
    mandate_id: ID,
}

public(package) fun authorize_and_record(
    cap: &AgentCap,
    mandate: &mut AgentMandate,
    treasury_id: ID,
    amount: u64,
    policy_version: u64,
    now_ms: u64,
    ctx: &TxContext,
) {
    assert!(cap.mandate_id == object::id(mandate), EAgentCapMismatch);
    assert!(mandate.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(mandate.agent == tx_context::sender(ctx), EAgentMismatch);
    assert!(
        !mandate.revoked &&
            now_ms >= mandate.valid_from_ms &&
            now_ms <= mandate.valid_until_ms,
        EMandateInactive,
    );
    assert!(mandate.policy_version == policy_version, EPolicyVersionMismatch);
    assert!(amount <= mandate.max_per_payment, EPerPaymentLimitExceeded);

    if (now_ms >= mandate.period_started_at_ms + mandate.period_duration_ms) {
        mandate.period_started_at_ms = now_ms;
        mandate.period_spent = 0;
    };
    assert!(
        mandate.period_spent + amount <= mandate.period_limit,
        EPeriodLimitExceeded,
    );
    mandate.period_spent = mandate.period_spent + amount;
}

public fun period_spent(mandate: &AgentMandate): u64 { mandate.period_spent }
public fun policy_version(mandate: &AgentMandate): u64 { mandate.policy_version }
public fun treasury_id(mandate: &AgentMandate): ID { mandate.treasury_id }

public fun revoke<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    mandate: &mut AgentMandate,
) {
    treasury::assert_admin(admin_cap, treasury);
    assert!(mandate.treasury_id == treasury::id(treasury), ETreasuryMismatch);
    mandate.revoked = true;
}

#[test_only]
public fun create_for_testing(
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): (AgentMandate, AgentCap) {
    let mandate = AgentMandate {
        id: object::new(ctx),
        treasury_id,
        agent,
        max_per_payment,
        period_limit,
        period_spent: 0,
        period_started_at_ms: 0,
        period_duration_ms: 10_000,
        valid_from_ms: 0,
        valid_until_ms: 10_000,
        approval_threshold: max_per_payment,
        max_rebalance: 0,
        policy_version,
        revoked: false,
    };
    let agent_cap = AgentCap {
        id: object::new(ctx),
        mandate_id: object::id(&mandate),
    };
    (mandate, agent_cap)
}

#[test_only]
public fun destroy_for_testing(mandate: AgentMandate, cap: AgentCap) {
    let AgentMandate {
        id,
        treasury_id: _,
        agent: _,
        max_per_payment: _,
        period_limit: _,
        period_spent: _,
        period_started_at_ms: _,
        period_duration_ms: _,
        valid_from_ms: _,
        valid_until_ms: _,
        approval_threshold: _,
        max_rebalance: _,
        policy_version: _,
        revoked: _,
    } = mandate;
    let AgentCap { id: cap_id, mandate_id: _ } = cap;
    object::delete(id);
    object::delete(cap_id);
}
