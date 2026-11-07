'use client';

/** Đợt C §5.5: one player for the page, so a second speaker stops the file still playing (`Audio` is made on first use, never on the server). */
let player: HTMLAudioElement | null = null;

/** Plays `url`, stopping any file playing first; rejects when the file cannot load or play (the caller falls back to the browser voice). */
export async function playAudio(url: string): Promise<void> {
  if (!player) player = new Audio();
  player.pause();
  player.src = url;
  await player.play();
}
