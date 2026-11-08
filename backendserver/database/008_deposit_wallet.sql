-- Deposit wallet: admin deposits (+) and Active New ID package payments (-). Append-only history.
CREATE TABLE IF NOT EXISTS lo_deposits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deposit_code VARCHAR(60) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  kind ENUM('ADMIN_ADD','ACTIVATE_ID') NOT NULL,
  amount DECIMAL(14,3) NOT NULL,
  target_user_id INT UNSIGNED NULL,
  activation_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (user_id, created_at),
  KEY (target_user_id)
) ENGINE=InnoDB;
