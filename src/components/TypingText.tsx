import React, { useState, useEffect } from 'react';
import { Text, TextStyle } from 'react-native';

interface TypingTextProps {
  text: string;
  speed?: number; // milliseconds per character
  style?: TextStyle | TextStyle[];
  onComplete?: () => void;
}

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  speed = 30,
  style,
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <Text style={style}>{displayedText}</Text>;
};
