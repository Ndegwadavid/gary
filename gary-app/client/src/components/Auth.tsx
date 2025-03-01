// client/src/components/Auth.tsx
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';

interface AuthProps {
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailAuth = async () => {
    try {
      setError(null);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
      navigate('/me');
    } catch (error: any) {
      let errorMessage = error.message;
      switch (error.code) {
        case 'auth/network-request-failed':
          errorMessage =
            'Network error: Ensure Firebase emulators are running or check your internet connection.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already in use.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password must be at least 6 characters long.';
          break;
        default:
          errorMessage = `Authentication failed: ${error.message}`;
      }
      setError(errorMessage);
      console.error(`${isSignUp ? 'Signup' : 'Login'} failed:`, error);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
      onClose();
      navigate('/me');
    } catch (error: any) {
      let errorMessage = error.message;
      switch (error.code) {
        case 'auth/network-request-failed':
          errorMessage =
            'Network error: Ensure Firebase emulators are running or check your internet connection.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Google sign-in popup was closed.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked by the browser. Please allow popups.';
          break;
        default:
          errorMessage = `Google authentication failed: ${error.message}`;
      }
      setError(errorMessage);
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