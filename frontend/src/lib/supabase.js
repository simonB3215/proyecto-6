import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Validación para la consola del navegador (solo imprime los primeros caracteres para seguridad)
console.log("Supabase URL Cargada:", supabaseUrl);
console.log("Anon Key Cargada:", supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "VACIA");

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
