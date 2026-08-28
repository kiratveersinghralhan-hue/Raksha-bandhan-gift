import { giftConfig } from '../config/giftConfig';

export interface Message {
  id: string;
  title: string;
  content: string;
  image?: string;
  audio?: string;
}

// These are deliberately light placeholders—not fabricated personal stories.
export const messages: Message[] = [
  { id: 'miss-home', title: 'OPEN WHEN YOU MISS HOME', content: 'Home is not going anywhere. Neither are the people who know every version of you.' },
  { id: 'laugh', title: 'OPEN WHEN YOU NEED TO LAUGH', content: 'Remember: I have photographic evidence. We can negotiate the release terms.' },
  { id: 'far', title: 'OPEN WHEN CANADA FEELS TOO FAR', content: 'Eleven thousand kilometres sounds dramatic. A message home is still only one tap away.' },
  { id: 'mad', title: 'OPEN WHEN YOU’RE MAD AT ME', content: `${giftConfig.sisterNickname}, your complaint has been received and will be reviewed within three to five business years.` },
  { id: 'us', title: 'OPEN WHEN YOU MISS US', content: 'The noise, the food, the arguments, the familiar rooms—they are all waiting for you.' },
  { id: 'reminder', title: 'OPEN WHEN YOU NEED A REMINDER', content: 'You are deeply loved, loudly missed, and always part of this home.' },
];
