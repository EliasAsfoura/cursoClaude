## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Autenticación (Supabase Auth)

Registro, login con email y contraseña, Google, GitHub y recuperación de contraseña. No requiere variables de entorno nuevas: los client id/secret de OAuth se guardan en el dashboard de Supabase, no en `.env.local`.

Configuración manual (una vez por proyecto):

1. **Supabase → Authentication → Sign In / Providers → Email:** desactivar **Confirm email** (el registro inicia sesión al instante).
2. **Supabase → Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` (y la URL de producción `https://<tu-dominio>/auth/callback`).
3. **Google:** en Google Cloud Console → APIs & Services → Credentials → OAuth client ID (tipo Web), agregar como Authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Copiar Client ID y Secret en Supabase → Providers → Google y activarlo.
4. **GitHub:** en GitHub → Settings → Developer settings → OAuth Apps → New OAuth App, usar como Authorization callback URL `https://<project-ref>.supabase.co/auth/v1/callback`. Copiar Client ID y generar un Client Secret; pegarlos en Supabase → Providers → GitHub y activarlo.

5. **Plantilla del correo de recuperación** (Supabase → Authentication → Email Templates → Reset Password): reemplazar el enlace por
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/nueva-contrasena">Restablecer contraseña</a>
   ```
   Así el enlace funciona aunque se abra en otro navegador o dispositivo, y los escáneres de correo no consumen el token (la verificación ocurre al pulsar "Continuar" en `/auth/confirm`). Requiere que **Site URL** sea correcto en cada entorno.

Notas:

- El username vive en `user_metadata.username` (sin unicidad). Los usuarios OAuth lo toman del proveedor.
- Los scores se guardan solo con sesión (`scores.user_id` + RLS). Los invitados pueden jugar pero no guardar.
- El SMTP por defecto de Supabase limita los emails de recuperación (~2 por hora); para producción conviene configurar un SMTP propio.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
