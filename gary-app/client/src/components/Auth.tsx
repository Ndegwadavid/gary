// src/components/Auth.tsx
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthProps {
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    try {
      setError(null);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (error: any) {
      setError(error.message);
      console.error(`${isSignUp ? 'Signup' : 'Login'} failed:`, error);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (error: any) {
      setError(error.message);
      console.error('Google auth failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg text-black max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4">
          {isSignUp ? 'Sign Up for Gary' : 'Login to Gary'}
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <button
          onClick={handleEmailAuth}
          className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition"
        >
          {isSignUp ? 'Sign Up' : 'Login'}
        </button>
        <button
          onClick={handleGoogleAuth}
          className="w-full bg-blue-600 text-white p-2 mt-2 rounded hover:bg-blue-700 transition"
        >
          {isSignUp ? 'Sign Up with Google' : 'Login with Google'}
        </button>
        <p className="mt-4 text-center text-sm">
          {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-600 hover:underline"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Auth;