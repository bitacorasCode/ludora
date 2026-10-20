import type { ActionResult } from '@/lib/actions';

export type ApiOptions = Pick<RequestInit, 'headers' | 'signal'>;

export type PublicApiOptions = ApiOptions & Pick<RequestInit, 'cache'>;

export type ApiClient<TOptions extends ApiOptions = ApiOptions> = {
    get(path: string, options?: TOptions): Promise<ActionResult<unknown>>;
    post(
        path: string,
        body: unknown,
        options?: ApiOptions,
    ): Promise<ActionResult<unknown>>;
};
