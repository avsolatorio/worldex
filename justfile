@generate-password:
  cd secrets && poetry run ./generate_password.py
@generate-db-password:
  just generate-password | xargs -I {} echo "POSTGRES_PASSWORD={}" > ./secrets/postgres_password.env
