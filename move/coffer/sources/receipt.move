module coffer::receipt;

use sui::event;

const PAID_WITHIN_MANDATE: u8 = 0;

public struct DecisionReceipt has copy, drop {
    request_id: ID,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    policy_version: u64,
    decision_code: u8,
}

public(package) fun emit_paid_within_mandate(
    request_id: ID,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    policy_version: u64,
) {
    event::emit(DecisionReceipt {
        request_id,
        treasury_id,
        vendor,
        amount,
        policy_version,
        decision_code: PAID_WITHIN_MANDATE,
    });
}
