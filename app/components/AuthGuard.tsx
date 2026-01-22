import puter from "puter";

export default function Auth() {
  const handleLogin = async () => {
    try {
      const user = await puter.auth.signIn(); // ✅ NO embedded popup
      console.log("User logged in:", user);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={handleLogin}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Sign in with Puter
      </button>
    </div>
  );
}
