-- Un tag da puntos una sola vez por jugador: el indice evita que dos
-- escaneos simultaneos del mismo tag pasen la validacion del service.
CREATE UNIQUE INDEX "scans_history_user_id_tag_id_key" ON "scans_history"("user_id", "tag_id");
