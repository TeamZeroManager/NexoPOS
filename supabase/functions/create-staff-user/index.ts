// create-staff-user
// ---------------------------------------------------------
// Crea un usuario del sistema (cajero/administrador) SIN cerrar
// la sesion del administrador que lo esta creando. supabase.auth
// .signUp() del lado del cliente reemplazaria la sesion activa,
// por eso esto se hace en una Edge Function con la service_role
// key (nunca expuesta al navegador).
//
// El "username" visible en la UI se traduce a username@pos.local
// para Supabase Auth (unicidad GLOBAL, no por empresa) para que el
// login funcione desde cualquier dispositivo sin conocer de antemano
// la empresa del usuario.
//
// Verifica:
//   1) que quien llama tenga sesion valida
//   2) que su rol tenga el permiso MANAGE_USERS
//   3) que el rol asignado al nuevo usuario pertenezca a la MISMA
//      empresa de quien lo crea (evita fuga entre negocios)
//
// Desplegar con el MCP de Supabase o `supabase functions deploy create-staff-user`.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Sesion invalida" }, 401);

    const { data: caller, error: callerError } = await callerClient
      .from("usuarios")
      .select("empresa_id, rol_id, roles(permisos)")
      .eq("id", userData.user.id)
      .single();

    if (callerError || !caller) return json({ error: "Usuario no encontrado" }, 403);

    const permisos: string[] = (caller as any).roles?.permisos ?? [];
    if (!permisos.includes("MANAGE_USERS")) {
      return json({ error: "No tienes permiso para crear usuarios" }, 403);
    }

    const body = await req.json();
    const { nombre, username, password, rolId } = body ?? {};
    if (!nombre || !username || !password || !rolId) {
      return json({ error: "Faltan campos requeridos" }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: "La contrasena debe tener minimo 6 caracteres" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: role, error: roleError } = await adminClient
      .from("roles")
      .select("id")
      .eq("id", rolId)
      .eq("empresa_id", (caller as any).empresa_id)
      .single();
    if (roleError || !role) return json({ error: "Rol invalido" }, 400);

    const syntheticEmail = `${String(username).toLowerCase()}@pos.local`;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      const msg = /already.*registered|already.*exists/i.test(createError?.message ?? "")
        ? "Ese nombre de usuario ya está en uso"
        : createError?.message ?? "No se pudo crear el usuario";
      return json({ error: msg }, 400);
    }

    const { error: insertError } = await adminClient.from("usuarios").insert({
      id: created.user.id,
      empresa_id: (caller as any).empresa_id,
      nombre,
      username: String(username).toLowerCase(),
      rol_id: rolId,
      activo: true,
    });

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      const msg = /duplicate|unique/i.test(insertError.message) ? "Ese nombre de usuario ya está en uso" : insertError.message;
      return json({ error: msg }, 400);
    }

    return json({ id: created.user.id }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
