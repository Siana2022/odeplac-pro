'use client'

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Por favor, rellena todos los campos');
    
    setLoading(true);
    
    try {
      // 1. Intentar iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) throw error;

      // 2. Si el login es correcto, consultamos el ROL en la tabla perfiles
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', data.user.id)
        .single();

      if (perfilError) throw new Error('No se pudo verificar el perfil de usuario');

      toast.success('Sesión iniciada correctamente');

      // 3. Redirección inteligente basada en el ROL
      if (perfil.rol === 'admin') {
        router.push('/dashboard/obras');
      } else {
        router.push('/portal');
      }
      
      router.refresh();

    } catch (error: any) {
      toast.error('Acceso denegado: ' + (error.message || 'Credenciales incorrectas'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#295693] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl space-y-10 border border-white/20">
        
        {/* Cabecera del Login */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-3xl mb-2">
            <Lock className="text-[#295693]" size={28} />
          </div>
          <h1 className="text-4xl font-black text-[#295693] italic uppercase tracking-tighter leading-none">
            ODEPLAC <span className="text-blue-400">PRO</span>
          </h1>
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">Gestión de Obras e Insonorización</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
              <input 
                type="email" 
                required
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] focus:bg-white transition-all placeholder:text-zinc-300"
                placeholder="usuario@odeplac.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 tracking-widest">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
              <input 
                type="password" 
                required
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-bold text-zinc-800 outline-none focus:border-[#295693] focus:bg-white transition-all placeholder:text-zinc-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#295693] text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Entrar en el sistema <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
            © 2026 Odeplac Pro • Software Privado
          </p>
        </div>
      </div>
    </div>
  );
}