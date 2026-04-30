import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // Limpiar el token gigante de la URL si venimos de un link de confirmación/login
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {!session ? <Auth /> : <Dashboard session={session} />}
    </>
  );
}

export default App;
