GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE sim_accounts TO anon, authenticated, service_role;
GRANT ALL ON TABLE sim_positions TO anon, authenticated, service_role;
GRANT ALL ON TABLE sim_orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE sim_trades TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "own_sim_accounts" ON sim_accounts;
DROP POLICY IF EXISTS "own_sim_positions" ON sim_positions;
DROP POLICY IF EXISTS "own_sim_orders" ON sim_orders;
DROP POLICY IF EXISTS "own_sim_trades" ON sim_trades;

CREATE POLICY "own_sim_accounts_select"
ON sim_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_accounts_insert"
ON sim_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_accounts_update"
ON sim_accounts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_accounts_delete"
ON sim_accounts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_positions_select"
ON sim_positions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_positions_insert"
ON sim_positions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_positions_update"
ON sim_positions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_positions_delete"
ON sim_positions
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_orders_select"
ON sim_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_orders_insert"
ON sim_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_orders_update"
ON sim_orders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_orders_delete"
ON sim_orders
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_trades_select"
ON sim_trades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "own_sim_trades_insert"
ON sim_trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_trades_update"
ON sim_trades
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sim_trades_delete"
ON sim_trades
FOR DELETE
USING (auth.uid() = user_id);
