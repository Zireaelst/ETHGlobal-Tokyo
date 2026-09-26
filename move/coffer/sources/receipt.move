module coffer::receipt;

use sui::event;

const PAID_WITHIN_MANDATE: u8 = 0;
const HUMAN_AUTHORIZED_EXCEPTION: u8 = 1;
const STANDING_ORDER_EXECUTED: u8 = 2;

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

public(package) fun emit_human_authorized_exception(
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
        decision_code: HUMAN_AUTHORIZED_EXCEPTION,
    });
}

public(package) fun emit_standing_order_executed(
    order_id: ID,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    policy_version: u64,
) {
    event::emit(DecisionReceipt {
        request_id: order_id,
        treasury_id,
        vendor,
        amount,
        policy_version,
        decision_code: STANDING_ORDER_EXECUTED,
    });
}
