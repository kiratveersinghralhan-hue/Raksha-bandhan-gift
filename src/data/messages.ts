export interface Message {
  id: string;
  title: string;
  content: string;
  image?: string;
  audio?: string;
}

export const messages: Message[] = [
  { id: 'miss-home', title: 'OPEN WHEN YOU MISS HOME', content: 'Home is still yours. It is still waiting for you. And no matter how far you go, you never stop belonging here.' },
  { id: 'laugh', title: 'OPEN WHEN YOU NEED TO LAUGH', content: 'Just remember that no matter how grown up you become, I still have enough embarrassing Motti memories to destroy your reputation in seconds.' },
  { id: 'far', title: 'OPEN WHEN CANADA FEELS TOO FAR', content: 'Yes, Canada is far. But not far enough to make you any less ours. We are still here, and so is your place in this family.' },
  { id: 'mad', title: 'OPEN WHEN YOU’RE MAD AT ME', content: 'First of all, rude. Second, even when you are mad at me, you are still my favourite sister. So calm down a little.' },
  { id: 'us', title: 'OPEN WHEN YOU MISS US', content: 'We miss you too — in the ordinary moments, the noisy family moments, and especially in the little spaces that still feel incomplete without you.' },
  { id: 'reminder', title: 'OPEN WHEN YOU NEED A REMINDER', content: 'You are loved, deeply missed, and impossible to replace. Distance may change the map, but it never changes who you are to us.' },
];
