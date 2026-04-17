export interface AudioTrack {
  id: string;
  label: string;
  mood: string;
  url: string;
  color: string; // accent color for the card
}

export const AUDIO_LIBRARY: AudioTrack[] = [
  {
    id: "energetic_1",
    label: "Rise & Shine",
    mood: "Energetic",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "orange",
  },
  {
    id: "chill_1",
    label: "Lo-Fi Dreams",
    mood: "Chill",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    color: "blue",
  },
  {
    id: "cinematic_1",
    label: "Epic Horizon",
    mood: "Cinematic",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    color: "purple",
  },
  {
    id: "corporate_1",
    label: "Clean & Bold",
    mood: "Corporate",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    color: "cyan",
  },
  {
    id: "happy_1",
    label: "Summer Vibes",
    mood: "Happy",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    color: "yellow",
  },
  {
    id: "dark_1",
    label: "Midnight Drop",
    mood: "Dark",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    color: "red",
  },
  {
    id: "upbeat_1",
    label: "High Voltage",
    mood: "Upbeat",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    color: "emerald",
  },
  {
    id: "ambient_1",
    label: "Zen Flow",
    mood: "Ambient",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    color: "teal",
  },
];

export const DEFAULT_TRACK = AUDIO_LIBRARY[0];
