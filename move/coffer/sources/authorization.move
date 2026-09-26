module coffer::authorization;

use coffer::treasury::{Self, Treasury, TreasuryAdminCap};

const EVerifierTreasuryMismatch: u64 = 1;
const ETicketTreasuryMismatch: u64 = 2;
const ERequestMismatch: u64 = 3;
const EVendorMismatch: u64 = 4;
const EAmountExceedsAuthorization: u64 = 5;
const EActionDigestMismatch: u64 = 6;
const EAuthorizationExpired: u64 = 7;

public struct WorldVerifierCap has key, store {
    id: UID,
    treasury_id: ID,
}

public struct AuthorizationTicket has key {
    id: UID,
    treasury_id: ID,
    payment_request_id: ID,
    vendor: address,
    action_digest: vector<u8>,
    max_amount: u64,
    expires_at_ms: u64,
    nonce: vector<u8>,
}

public fun create_verifier<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    ctx: &mut TxContext,
): WorldVerifierCap {
    treasury::assert_admin(admin_cap, treasury);
    WorldVerifierCap {
        id: object::new(ctx),
        treasury_id: treasury::id(treasury),
    }
}

public fun mint_ticket(
    verifier_cap: &WorldVerifierCap,
    treasury_id: ID,
    payment_request_id: ID,
    vendor: address,
    action_digest: vector<u8>,
    max_amount: u64,
    expires_at_ms: u64,
    nonce: vector<u8>,
    ctx: &mut TxContext,
): AuthorizationTicket {
    assert!(verifier_cap.treasury_id == treasury_id, EVerifierTreasuryMismatch);
    AuthorizationTicket {
        id: object::new(ctx),
        treasury_id,
        payment_request_id,
        vendor,
        action_digest,
        max_amount,
        expires_at_ms,
        nonce,
    }
}

public(package) fun validate_and_consume(
    ticket: AuthorizationTicket,
    treasury_id: ID,
    payment_request_id: ID,
    vendor: address,
    action_digest: &vector<u8>,
    amount: u64,
    now_ms: u64,
) {
    let AuthorizationTicket {
        id,
        treasury_id: authorized_treasury,
        payment_request_id: authorized_request,
        vendor: authorized_vendor,
        action_digest: authorized_digest,
        max_amount,
        expires_at_ms,
        nonce: _,
    } = ticket;
    assert!(authorized_treasury == treasury_id, ETicketTreasuryMismatch);
    assert!(authorized_request == payment_request_id, ERequestMismatch);
    assert!(authorized_vendor == vendor, EVendorMismatch);
    assert!(amount <= max_amount, EAmountExceedsAuthorization);
    assert!(authorized_digest == *action_digest, EActionDigestMismatch);
    assert!(now_ms <= expires_at_ms, EAuthorizationExpired);
    object::delete(id);
}

#[test_only]
public fun create_verifier_for_testing(
    treasury_id: ID,
    ctx: &mut TxContext,
): WorldVerifierCap {
    WorldVerifierCap { id: object::new(ctx), treasury_id }
}

#[test_only]
public fun destroy_verifier_for_testing(cap: WorldVerifierCap) {
    let WorldVerifierCap { id, treasury_id: _ } = cap;
    object::delete(id);
}

#[test_only]
public fun destroy_ticket_for_testing(ticket: AuthorizationTicket) {
    let AuthorizationTicket {
        id,
        treasury_id: _,
        payment_request_id: _,
        vendor: _,
        action_digest: _,
        max_amount: _,
        expires_at_ms: _,
        nonce: _,
    } = ticket;
    object::delete(id);
}
