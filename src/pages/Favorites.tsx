import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Favorites() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/profile?tab=favorites', { replace: true });
  }, [navigate]);
  return null;
}
