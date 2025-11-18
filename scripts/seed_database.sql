-- Inserir um usuário de exemplo
INSERT INTO users (username, password, name, email, created_at) 
VALUES ('usuario_teste', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Usuário Teste', 'teste@example.com', NOW());

-- Inserir categorias de despesa
INSERT INTO categories (name, type, color, icon, user_id) VALUES
('Alimentação', 'expense', '#FF6B6B', 'utensils', 1),
('Transporte', 'expense', '#4ECDC4', 'car', 1),
('Moradia', 'expense', '#45B7D1', 'home', 1),
('Lazer', 'expense', '#96CEB4', 'film', 1),
('Saúde', 'expense', '#FFEEAD', 'heart', 1),
('Educação', 'expense', '#D4A5A5', 'book', 1),
('Outros', 'expense', '#9B9B9B', 'more-horizontal', 1);

-- Inserir categorias de receita
INSERT INTO categories (name, type, color, icon, user_id) VALUES
('Salário', 'income', '#77DD77', 'dollar-sign', 1),
('Freelance', 'income', '#AEC6CF', 'code', 1),
('Investimentos', 'income', '#FDFD96', 'trending-up', 1),
('Presente', 'income', '#FFB347', 'gift', 1),
('Outros', 'income', '#9B9B9B', 'more-horizontal', 1);

-- Inserir transações de exemplo
-- Despesas
INSERT INTO transactions (description, amount, date, type, category_id, status, is_recurring, expense_type, user_id, created_at) VALUES
('Supermercado', 350.50, '2023-06-10', 'expense', 1, 'paid', 0, 'variable', 1, NOW()),
('Ônibus', 5.50, '2023-06-10', 'expense', 2, 'paid', 0, 'fixed', 1, NOW()),
('Aluguel', 1200.00, '2023-06-05', 'expense', 3, 'paid', 1, 'fixed', 1, NOW()),
('Cinema', 35.00, '2023-06-08', 'expense', 4, 'paid', 0, 'variable', 1, NOW()),
('Consulta médica', 200.00, '2023-06-12', 'expense', 5, 'pending', 0, 'variable', 1, NOW());

-- Receitas
INSERT INTO transactions (description, amount, date, type, category_id, status, user_id, created_at) VALUES
('Salário', 3500.00, '2023-06-05', 'income', 8, 'received', 1, NOW()),
('Freelance Site', 1200.00, '2023-06-08', 'income', 9, 'received', 1, NOW()),
('Dividendos', 150.75, '2023-06-12', 'income', 10, 'pending', 1, NOW());

-- Inserir metas
INSERT INTO goals (name, target_amount, current_amount, target_date, description, user_id, created_at) VALUES
('Viagem para Europa', 15000.00, 2500.00, '2024-12-31', 'Economias para viajar pela Europa', 1, NOW()),
('Notebook novo', 5000.00, 1200.00, '2023-12-31', 'Notebook para trabalho', 1, NOW());

-- Inserir investimentos
INSERT INTO investments (name, type, amount, interest_rate, start_date, maturity_date, user_id, created_at) VALUES
('CDB Banco XP', 'cdb', 5000.00, 12.5, '2023-01-15', '2024-01-15', 1, NOW()),
('Tesouro IPCA+', 'tesouro_direto', 3000.00, 5.5, '2023-02-20', '2026-02-20', 1, NOW());

-- Inserir alertas
INSERT INTO alerts (message, type, is_read, user_id, created_at) VALUES
('Conta de luz vence amanhã', 'warning', 0, 1, NOW()),
('Investimento CDB rendeu R$ 52,30', 'success', 0, 1, NOW()),
('Você ultrapassou o orçamento de lazer', 'danger', 1, 1, NOW());
