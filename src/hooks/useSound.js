import { useCallback } from 'react';
import { playSound, getSoundSettings } from '@/lib/sounds';

export function useSound() {
  const play = useCallback((soundName) => {
    playSound(soundName);
  }, []);

  return { play, getSoundSettings };
}
