-- Additive member balance-transfer and mobile-recharge records. Existing rows are never rewritten.
CREATE TABLE IF NOT EXISTS lo_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transfer_code VARCHAR(60) NOT NULL UNIQUE,
  from_user_id INT UNSIGNED NOT NULL,
  to_user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(14,3) NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (from_user_id, created_at),
  KEY (to_user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lo_recharges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recharge_code VARCHAR(60) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  operator VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  amount DECIMAL(14,3) NOT NULL,
  status ENUM('PENDING','PAID','REJECTED') NOT NULL DEFAULT 'PENDING',
  admin_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  KEY (user_id, status),
  KEY (created_at)
) ENGINE=InnoDB;

-- Feature switches and limits shown in the admin panel.
-- Transfer and recharge start disabled until the owner approves their rules and enables them in admin settings.
INSERT IGNORE INTO lo_settings (k, v) VALUES
 ('transfer_status','0'),('transfer_min','10'),('transfer_max','25000'),
 ('recharge_status','0'),('recharge_min','10'),('recharge_max','5000');
