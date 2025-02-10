/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Auth, ServiceAccount } from '../helpers/auth';

/**
 * A client for interacting with the Google Ads API.
 *
 * Handles authentication and constructing the HTTP body and headers.
 */
export class GoogleAdsApiClient {
  private customerId: string;
  private developerToken: string;
  private loginCustomerId: string | undefined;
  private serviceAccount: ServiceAccount | undefined;
  private baseUrl: string;
  private authToken: string;
  private cache: Record<string, Object> = {};

  constructor(
    customerId: string,
    developerToken: string,
    serviceAccount?: ServiceAccount,
    loginCustomerId?: string
  ) {
    this.customerId = customerId;
    this.developerToken = developerToken;

    this.serviceAccount = serviceAccount ?? undefined;
    this.loginCustomerId = loginCustomerId ?? undefined;

    this.baseUrl = 'https://googleads.googleapis.com/v18';

    const auth = new Auth(serviceAccount ?? undefined);
    this.authToken = auth.getAuthToken();
  }

  /**
   * Makes an API call to the Google Ads API.
   *
   * @param {string} path - The path to the API endpoint.
   * @param {string} method - The HTTP method to use. Defaults to 'get'.
   * @param {Object} payload - The payload to send with the request.
   * @param {boolean} forceCache - Whether to force caching of the response. Defaults to false.
   * @returns {Object} The response from the API.
   * @throws {Error} If the API call fails.
   */
  makeApiCall(
    path: string,
    method = 'get',
    payload: Object,
    forceCache = false
  ) {
    const headers: GoogleAppsScript.URL_Fetch.HttpHeaders = {
      Authorization: `Bearer ${this.authToken}`,
      Accept: '*/*',
      'developer-token': this.developerToken ?? '',
    };

    if (this.loginCustomerId) {
      headers['login-customer-id'] = String(this.loginCustomerId);
    }

    const url = `${this.baseUrl}/${path}`;
    return this.fetchUrl(
      url,
      headers,
      undefined,
      payload,
      method,
      undefined,
      forceCache
    );
  }

  /**
   * Fetches a URL which is the HTTP endpoint of a Google Ads API.
   *
   * @param {string} url - The URL to fetch.
   * @param {GoogleAppsScript.URL_Fetch.HttpHeaders} headers - The headers to
   *   include in the request.
   * @param {Record<string, string>} queryParams - The query parameters to
   *   include in the request.
   * @param {Object} body - The request body.
   * @param {string} method - The HTTP method to use. Defaults to 'get'.
   * @param {string} contentType - The content type of the request body.
   *   Defaults to 'application/json'.
   * @param {boolean} forceCache - Whether to force caching of the response.
   *   Defaults to false.
   * @returns {Object} The response from the API.
   * @throws {Error} If the API call fails.
   */
  private fetchUrl(
    url: string,
    headers?: GoogleAppsScript.URL_Fetch.HttpHeaders,
    queryParams?: Record<string, string>,
    body?: Object,
    method = 'get',
    contentType = 'application/json',
    forceCache = false
  ) {
    if (queryParams) {
      url = `${url}${this.objectToUrlQuery(url, queryParams)}`;
    }

    const params: {
      headers: GoogleAppsScript.URL_Fetch.HttpHeaders;
      method: GoogleAppsScript.URL_Fetch.HttpMethod;
      muteHttpExceptions: boolean;
      contentType?: string;
      payload?: Object;
    } = {
      headers: headers ?? {},
      method: method as GoogleAppsScript.URL_Fetch.HttpMethod,
      muteHttpExceptions: true,
      contentType: contentType,
    };

    // Add body if any
    if (body) {
      // Stringify JSON if applicable
      if (contentType === 'application/json') {
        body = JSON.stringify(body);
      }

      params.payload = body;
    }

    const cacheKey = `${url}-${JSON.stringify(params)}`;

    if (cacheKey in this.cache && this.cache[cacheKey]) {
      console.log(
        'Returning cached result',
        JSON.stringify(this.cache[cacheKey])
      );
      return this.cache[cacheKey];
    }

    const resRaw = UrlFetchApp.fetch(url, params);

    if (200 !== resRaw.getResponseCode() && 204 !== resRaw.getResponseCode()) {
      Logger.log('HTTP code: ' + resRaw.getResponseCode());
      Logger.log('API error: ' + resRaw.getContentText());
      Logger.log('URL: ' + url);
      Logger.log('Parameters: ' + JSON.stringify(params));
      throw new Error(resRaw.getContentText());
    }

    const res = resRaw.getContentText()
      ? JSON.parse(resRaw.getContentText())
      : {};

    // Only cache GET and forced cache requests
    if (method.toLowerCase() === 'get' || forceCache) {
      this.cache[cacheKey] = res;
    }

    return res;
  }

  /**
   * Convert object into URL query string.
   *
   * @param {string} url
   * @param {Record<string, unknown>} obj
   * @returns {string}
   */
  objectToUrlQuery(url: string, obj?: Record<string, unknown>) {
    if (!obj || (obj && Object.keys(obj).length === 0)) return '';

    const prefix = url.includes('?') ? '&' : '?';

    return prefix.concat(
      Object.keys(obj)
        .map(key => {
          if (obj[key] instanceof Array) {
            const joined = (obj[key] as Array<unknown>).join(`&${key}=`);
            return joined.length ? `${key}=${joined}` : null;
          }
          return `${key}=${obj[key]}`;
        })
        .filter(param => param)
        .join('&')
    );
  }
}
