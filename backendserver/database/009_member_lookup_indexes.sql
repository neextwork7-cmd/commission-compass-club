-- Additive lookup indexes for large imported member bases (login, sponsor and referral lookups).
CREATE INDEX lo_users_life_id ON users (life_id);
CREATE INDEX lo_users_phone ON users (phone);
CREATE INDEX lo_users_referral_code ON users (referral_code);
CREATE INDEX lo_users_referred_by ON users (referred_by);
CREATE INDEX lo_activations_status ON lo_activations (payment_status, processed);
