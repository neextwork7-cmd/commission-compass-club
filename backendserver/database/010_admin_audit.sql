-- Records admin actions taken on member accounts (password resets, one-click logins).
CREATE TABLE IF NOT EXISTS lo_admin_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ip VARCHAR(45) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY lo_admin_audit_user (user_id),
  KEY lo_admin_audit_admin (admin_id)
) ENGINE=InnoDB;
