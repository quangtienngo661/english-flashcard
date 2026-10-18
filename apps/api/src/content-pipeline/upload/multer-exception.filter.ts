import { ArgumentsHost, Catch, Inject, PayloadTooLargeException, type ExceptionFilter } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ProblemDetailsFilter } from '../../common/problem-details/problem-details.filter.js';

@Catch(PayloadTooLargeException)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly problemDetails: ProblemDetailsFilter;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.problemDetails = new ProblemDetailsFilter(config.problemTypeBase);
  }

  catch(exception: PayloadTooLargeException, host: ArgumentsHost): void {
    this.problemDetails.catch(new ProblemDetailsException({
      status: 413,
      type: 'file-too-large',
      title: 'File too large',
      detail: exception.message,
    }), host);
  }
}
