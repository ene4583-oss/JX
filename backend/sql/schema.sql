CREATE TABLE IF NOT EXISTS app_users (
 id VARCHAR(36) PRIMARY KEY, username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL, role VARCHAR(16) NOT NULL DEFAULT 'EMPLOYEE', active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_customers (
 id VARCHAR(36) PRIMARY KEY, identity_hash CHAR(64) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, address TEXT NOT NULL, area VARCHAR(150) NOT NULL DEFAULT '', phone VARCHAR(80) NOT NULL DEFAULT '',
 version INT NOT NULL DEFAULT 0, created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX customer_name(name)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_products (
 id VARCHAR(36) PRIMARY KEY, customer_id VARCHAR(36) NOT NULL, company VARCHAR(3) NOT NULL, product_type VARCHAR(12) NOT NULL,
 brand VARCHAR(150) NOT NULL, model VARCHAR(150) NOT NULL DEFAULT '', serial_no VARCHAR(150) NOT NULL DEFAULT '',
 identity_hash VARCHAR(64) NULL UNIQUE, details JSON NOT NULL, version INT NOT NULL DEFAULT 0,
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT product_customer FOREIGN KEY(customer_id) REFERENCES app_customers(id), INDEX product_serial(serial_no)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_jobs (
 id VARCHAR(36) PRIMARY KEY, request_id VARCHAR(36) NOT NULL UNIQUE, title VARCHAR(200) NOT NULL, stamping_date DATE NOT NULL,
 snapshot JSON NOT NULL, pdf LONGBLOB NOT NULL, created_by VARCHAR(36) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX job_time(created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_scan_sessions (
 id VARCHAR(36) PRIMARY KEY, owner_id VARCHAR(36) NOT NULL, pair_hash CHAR(64) NULL,
 mobile_hash CHAR(64) NULL, pair_expires TIMESTAMP NOT NULL, expires_at TIMESTAMP NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX scan_expiry(expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_scan_items (
 session_id VARCHAR(36) NOT NULL, product_id VARCHAR(36) NOT NULL,
 scanned_by VARCHAR(36) NOT NULL, scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(session_id,product_id), FOREIGN KEY(session_id) REFERENCES app_scan_sessions(id) ON DELETE CASCADE,
 FOREIGN KEY(product_id) REFERENCES app_products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_audit (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 action VARCHAR(50) NOT NULL, entity_id VARCHAR(100) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_imports (
 file_hash CHAR(64) PRIMARY KEY, created_by VARCHAR(36) NOT NULL, result JSON NOT NULL, original_file LONGBLOB NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_job_items (
 job_id VARCHAR(36) NOT NULL, product_id VARCHAR(36) NOT NULL,
 PRIMARY KEY(job_id,product_id), FOREIGN KEY(job_id) REFERENCES app_jobs(id), FOREIGN KEY(product_id) REFERENCES app_products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_legacy_history (
 source_hash CHAR(64) PRIMARY KEY, product_id VARCHAR(36) NOT NULL, payload JSON NOT NULL,
 imported_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(product_id) REFERENCES app_products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_http_sessions (
 session_id VARCHAR(128) COLLATE utf8mb4_bin PRIMARY KEY,
 expires BIGINT NOT NULL, data MEDIUMTEXT NOT NULL, INDEX session_expiry(expires)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_branding (
 id TINYINT PRIMARY KEY, mime VARCHAR(30) NOT NULL, image MEDIUMBLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
 setting_key VARCHAR(80) PRIMARY KEY, setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_import_batch_info (
 file_hash CHAR(64) PRIMARY KEY, filename VARCHAR(255) NOT NULL, FOREIGN KEY(file_hash) REFERENCES app_imports(file_hash) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_import_rows (
 source_hash CHAR(64) PRIMARY KEY, file_hash CHAR(64) NOT NULL, product_id VARCHAR(36) NOT NULL,
 FOREIGN KEY(source_hash) REFERENCES app_legacy_history(source_hash) ON DELETE CASCADE,
 FOREIGN KEY(file_hash) REFERENCES app_imports(file_hash) ON DELETE CASCADE,
 FOREIGN KEY(product_id) REFERENCES app_products(id), INDEX import_file(file_hash)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_import_products (
 product_id VARCHAR(36) PRIMARY KEY, FOREIGN KEY(product_id) REFERENCES app_products(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_import_customers (
 customer_id VARCHAR(36) PRIMARY KEY, FOREIGN KEY(customer_id) REFERENCES app_customers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_manual_customers (
 customer_id VARCHAR(36) PRIMARY KEY, FOREIGN KEY(customer_id) REFERENCES app_customers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_deleted_customers (
 customer_id VARCHAR(36) PRIMARY KEY,
 deleted_by VARCHAR(36) NOT NULL,
 deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES app_customers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_form_templates (
 company VARCHAR(3) NOT NULL, product_type VARCHAR(12) NOT NULL,
 background LONGBLOB NULL, layout JSON NOT NULL, filename VARCHAR(255) NOT NULL DEFAULT '',
 version INT NOT NULL DEFAULT 0, updated_by VARCHAR(36) NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(company,product_type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_scan_deliveries (
 session_id VARCHAR(36) NOT NULL, product_id VARCHAR(36) NOT NULL,
 version INT NOT NULL DEFAULT 1, acknowledged INT NOT NULL DEFAULT 0,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(session_id,product_id),
 FOREIGN KEY(session_id,product_id) REFERENCES app_scan_items(session_id,product_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_pair_devices (
 session_id VARCHAR(36) PRIMARY KEY,
 desktop_name VARCHAR(80) NOT NULL DEFAULT 'Computer', mobile_name VARCHAR(80) NOT NULL DEFAULT 'Phone',
 mobile_user_id VARCHAR(36) NULL, desktop_seen_at DATETIME(3) NULL, mobile_seen_at DATETIME(3) NULL,
 FOREIGN KEY(session_id) REFERENCES app_scan_sessions(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_pair_queue_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 session_id VARCHAR(36) NOT NULL, source VARCHAR(8) NOT NULL,
 request_id VARCHAR(36) NOT NULL, action VARCHAR(8) NOT NULL, product_ids JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY request_once(session_id,source,request_id), KEY queue_order(session_id,id),
 FOREIGN KEY(session_id) REFERENCES app_scan_sessions(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_pair_queue_receipts (
 session_id VARCHAR(36) NOT NULL, role VARCHAR(8) NOT NULL, through_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
 PRIMARY KEY(session_id,role), FOREIGN KEY(session_id) REFERENCES app_scan_sessions(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_device_groups (
 id VARCHAR(36) PRIMARY KEY, owner_id VARCHAR(36) NOT NULL,
 invite_hash CHAR(64) NULL, invite_expires DATETIME NOT NULL,
 expires_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_group_members (
 id VARCHAR(36) PRIMARY KEY, group_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 client_id VARCHAR(36) NOT NULL, token_hash CHAR(64) NOT NULL,
 name VARCHAR(80) NOT NULL, role VARCHAR(8) NOT NULL, seen_at DATETIME(3) NOT NULL,
 through_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
 UNIQUE KEY group_client(group_id,client_id),
 FOREIGN KEY(group_id) REFERENCES app_device_groups(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_group_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 group_id VARCHAR(36) NOT NULL, member_id VARCHAR(36) NOT NULL,
 request_id VARCHAR(36) NOT NULL, kind VARCHAR(16) NOT NULL, product_ids JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY group_request(group_id,member_id,request_id), KEY group_order(group_id,id),
 FOREIGN KEY(group_id) REFERENCES app_device_groups(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_group_products (
 group_id VARCHAR(36) NOT NULL, product_id VARCHAR(36) NOT NULL,
 PRIMARY KEY(group_id,product_id),
 FOREIGN KEY(group_id) REFERENCES app_device_groups(id) ON DELETE CASCADE,
 FOREIGN KEY(product_id) REFERENCES app_products(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_group_queue (
 group_id VARCHAR(36) NOT NULL, product_id VARCHAR(36) NOT NULL,
 PRIMARY KEY(group_id,product_id),
 FOREIGN KEY(group_id) REFERENCES app_device_groups(id) ON DELETE CASCADE,
 FOREIGN KEY(product_id) REFERENCES app_products(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
