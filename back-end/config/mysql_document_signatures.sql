-- Electronic Document Signatures Table pentru MySQL
CREATE TABLE IF NOT EXISTS document_signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    signature_id VARCHAR(255) UNIQUE NOT NULL,
    document_id INT,
    document_path VARCHAR(500),
    document_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(100),
    signature_data TEXT NOT NULL, -- JSON with signature info, canvas data, etc.
    signature_type VARCHAR(50) NOT NULL, -- 'draw', 'text', 'upload', 'csc_digital'
    position_x DECIMAL(10,2) DEFAULT 50.00,
    position_y DECIMAL(10,2) DEFAULT 50.00,
    position_page INT DEFAULT 1,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_hash VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES user(id_user)
);

-- Index for faster queries
CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_document_path ON document_signatures(document_path);
CREATE INDEX idx_document_signatures_user_id ON document_signatures(user_id);
CREATE INDEX idx_document_signatures_signed_at ON document_signatures(signed_at); 