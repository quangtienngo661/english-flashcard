import { Injectable } from '@nestjs/common';

export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

export class FakeClock extends Clock {
  private current: Date;

  constructor(start?: Date) {
    super();
    this.current = new Date(start ?? new Date());
  }

  now(): Date {
    return new Date(this.current);
  }

  set(d: Date): void {
    this.current = new Date(d);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
