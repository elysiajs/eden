# 1.3.1 - 5 May 2025
Bug fix:
- [#193](https://github.com/elysiajs/eden/pull/193) t.Files() upload from server side #124
- [#185](https://github.com/elysiajs/eden/pull/185) exclude null-ish values from query encoding by @ShuviSchwarze

# 1.3.0 - 5 May 2025
Feature:
- support Elysia 1.3

Breaking Change:
- [Treaty 2] drop the need for `.index()`

# 1.2.0 - 23 Dec 2024
Feature:
- support Elysia 1.2
- Validation error inference

# 1.1.3 - 5 Sep 2024
Feature:
- add provenance publish

# 1.1.2 - 25 Jul 2024
Feature:
- [#115](https://github.com/elysiajs/eden/pull/115) Stringify query params to allow the nested object

# 1.1.1 - 17 Jul 2024
Feature:
- support conditional value or stream from generator function

# 1.1.0 - 16 Jul 2024
Feature:
- support Elysia 1.1
- support response streaming with type inference

# 1.0.15 - 21 Jun 2024
Bug fix:
- [#105](https://github.com/elysiajs/eden/pull/105) Unify parsing into a util and add support for Date inside object
- [#100](https://github.com/elysiajs/eden/issues/100) Duplicated values when passing uppercase values for headers

# 1.0.14 - 23 May 2024
Feature:
- treaty2: add support for multipart/form-data
- fetch: add support for multipart/form-data

# 1.0.13 - 8 May 2024
Bug fix:
- [#87](https://github.com/elysiajs/eden/pull/87) serialization/deserialization problems with null, arrays and Date on websocket messages #87
- [#90](https://github.com/elysiajs/eden/pull/90) Auto convert request body to FormData when needed

# 1.0.12 - 23 Apr 2024
Improvement:
- [#80](https://github.com/elysiajs/eden/pull/80) add package.json to export field

Bug fix:
- [#84](https://github.com/elysiajs/eden/pull/84) treaty2: adjusts the creation of the query string
- [#76](https://github.com/elysiajs/eden/pull/76) treaty2: keep requestInit for redirect
- [#73](https://github.com/elysiajs/eden/pull/73) treaty2: file get sent as json

# 1.0.11 - 3 Apr 2024
Improvement:
- treaty2: add dedicated `processHeaders` function
- treaty2: simplify some headers workflow

Change:
- treaty2: using case-insensitive headers

# 1.0.10 - 3 Apr 2024
Bug fix:
- treaty2: skip content-type detection if provided

# 1.0.9 - 3 Apr 2024
Change:
- treaty2: `onRequest` execute before body serialization

# 1.0.8 - 28 Mar 2024
Bug fix:
- [#72](https://github.com/elysiajs/eden/pulls/72) treaty2: not mutate original paths array

# 1.0.6 - 21 Mar 2024
Bug fix:
- treaty2: default onResponse to null and mutate when need

# 1.0.6 - 21 Mar 2024
Change:
- treaty2: use null as default error value instead of undefined

# 1.0.5 - 20 Mar 2024
Feature:
treaty2: add `keepDomain` option

Change:
- treaty2: use null as default data value instead of undefined

Fix:
- treaty2: aligned schema with elysia/ws
- treaty: use uppercase http verbs

# 1.0.4 - 18 Mar 2024
Bug fix:
- Using regex for date pattern matching

# 1.0.2 - 18 Mar 2024
Feature:
- support for elysia 1.0.2

# 1.0.0 - 16 Mar 2024
Feature:
- treaty2

Bug fix:
- treaty1: fix [object Object] when body is empty

# 0.8.1 - 8 Jan 2024
Bug fix:
- [#41](https://github.com/elysiajs/eden/pull/41) params now optional for paramless routes in edenFetch
- [#39](https://github.com/elysiajs/eden/pull/39) transform entire object returned by execute

# 0.8.0 - 23 Dec 2023
Feature:
- Support Elysia 0.8

# 0.7.7 - 15 Dec 2023
Bug fix:
- treaty: [#36](https://github.com/elysiajs/eden/pull/36) FileArray send [ object Promise ] instead binary
- treaty: [#34](https://github.com/elysiajs/eden/pull/34) Add a way to get the unresolved Response for corner case support

# 0.7.6 - 6 Dec 2023
Feature:
- treaty: add 2nd optional parameter for sending query, header and fetch

Bug fix:
- treaty: send array and primitive value [#33](https://github.com/elysiajs/eden/issues/33)
- treaty: fix filename in FormData [#26](https://github.com/elysiajs/eden/pull/26)
- remove 'bun-types' from treaty

# 0.7.5 - 23 Oct 2023
Bug fix:
- treaty: handle `File[]`

# 0.7.4 - 29 Sep 2023
Feature:
- [#16](https://github.com/elysiajs/eden/issues/16) add transform

# 0.7.3 - 27 Sep 2023
Bug fix:
- using uppercase method name because of Cloudflare proxy

# 0.7.2 - 22 Sep 2023
Bug fix:
- resolve 'FileList' type
- using rimraf to clear previous build
- fix edenTreaty type is undefined when using moduleResolution: bundler

# 0.7.1 - 21 Sep 2023
Bug fix:
- type panic when `Definitions` is provided

# 0.7.0 - 20 Sep 2023
Improvement:
- update to Elysia 0.7.0

Change:
- remove Elysia Fn

# 0.6.5 - 12 Sep 2023
Bug fix:
- [#15](https://github.com/elysiajs/eden/pull/15) fetch: method inference on route with different methods
- [#17](https://github.com/elysiajs/eden/issues/17) treaty:  api.get() maps to request GET /ge instead of /

# 0.6.4 - 28 Aug 2023
Change:
- use tsup to bundle

# 0.6.3 - 28 Aug 2023
Feature:
- add query to Eden Fetch thanks to [#10](https://github.com/elysiajs/eden/pull/10)

# 0.6.2 - 26 Aug 2023
Feature:
- add the `$fetch` parameters to Eden Treaty
- add the following to response:
    - status - indicating status code
    - raw - Response
    - headers - Response's headers

Improvement:
- rewrite Eden type to New Eden
    - LoC reduced by ~35%
    - Faster type inference ~26%

# 0.6.1 - 17 Aug 2023
Feature:
- add support for Elysia 0.6.7

# 0.6.0 - 6 Aug 2023
Feature:
- add support for Elysia 0.6

# 0.5.6 - 10 Jun 2023
Improvement:
- treaty: Add custom fetch implementation for treaty

# 0.5.5 - 10 Jun 2023
Improvement:
- treaty: Automatic unwrap `Promise` response

Bug fix:
- treaty: query schema is missing

# 0.5.4 - 9 Jun 2023
Improvement:
- Awaited response data

# 0.5.3 - 25 May 2023
Improvement:
- treaty: add support for Bun file uploading

# 0.5.2 - 25 May 2023
Improvement:
- add types declaration to import map

Bug fix:
- add tsc to generate .d.ts

# 0.5.1 - 25 May 2023
Bug fix:
- treaty: type not found
- treaty: query not infers type

# 0.5.0 - 15 May 2023
Improvement:
- Add support for Elysia 0.5

# 0.4.1 - 1 April 2023
Improvement:
- Sometime query isn't required

# 0.4.0 - 30 Mar 2023
Improvement:
- Add support for Elysia 0.4

# 0.3.2 - 20 Mar 2023
Improvement:
- File upload support for Eden Treaty

# 0.3.1 - 20 Mar 2023
Improvement:
- Path parameter inference

# 0.3.0 - 17 Mar 2023
Improvement:
- Add support for Elysia 0.3.0

# 0.3.0-rc.2 - 17 Mar 2023
Breaking Change:
- Eden Fetch error handling use object destructuring, migration as same as Eden Treaty (0.3.0-rc.1)

# 0.3.0-rc.1 - 16 Mar 2023
Improvement:
- Update @sinclair/typebox to 0.25.24

Breaking Change:
- Eden Treaty error handling use object destructuring
    - To migrate:
    ```ts
    // to
    const anya = await client.products.nendoroid['1902'].put({
        name: 'Anya Forger'
    })

    // From
    const { data: anya, error } = await client.products.nendoroid['1902'].put({
        name: 'Anya Forger'
    })
    ```

# 0.3.0-rc.0 - 7 Mar 2023
Improvement:
- Add support for Elysia 0.3.0-rc.0

# 0.3.0-beta.4 - 4 Mar 2023
Improvement:
- Separate Eden type
- Rewrite Eden Treaty

# 0.3.0-beta.3 - 1 Mar 2023
Improvement:
- Add support for Elysia 0.3.0-beta.5

# 0.3.0-beta.2 - 28 Feb 2023
Improvement:
- Optimize type inference

# 0.3.0-beta.1 - 27 Feb 2023
Improvement:
- Add TypeBox as peer dependencies
- Minimum support for Elysia >= 0.3.0-beta.3

# 0.3.0-beta.0 - 25 Feb 2023
Fix:
- Eden doesn't transform path reference

# 0.2.1 - 27 Jan 2023
Feature:
- Elysia Fn
- Error type inference

Breaking Change:
- Error type inference

# 0.2.0-rc.9 - 27 Jan 2023
Improvement:
- Add params name for warning instead of `$params`
- Add warning to install Elysia before using Eden

# 0.2.0-rc.8 - 24 Jan 2023
Fix:
- Add support for Elysia WS which support Elysia 0.2.0-rc.1

# 0.2.0-rc.7 - 24 Jan 2023
Fix:
- Resolve Elysia 0.2.0-rc.1 type

# 0.2.0-rc.6 - 24 Jan 2023
Improvement:
- Set minimum Elysia version to 0.2.0-rc.1

# 0.2.0-rc.5 - 19 Jan 2023
Improvement:
- Handle application/json with custom encoding

# 0.2.0-rc.4 - 19 Jan 2023
Change:
- It's now required to specified specific version to use elysia

# 0.2.0-rc.3 - 7 Jan 2023
Improvement:
- Add `$params` to indicate any string params

Bug fix:
- Sometime Eden doesn't infer returned type

# 0.2.0-rc.2 - 5 Jan 2023
Improvement:
- Auto switch between `ws` and `wss`

# 0.2.0-rc.1 - 4 Jan 2023
Breaking Change:
- Change HTTP verb to lowercase

Feature:
- Support multiple path parameters

Bug fix:
- Required query in `subscribe`
- Make `unknown` type optional
- Add support for non-object fetch

# 0.2.0-rc.0 - 3 Jan 2023
Feature:
- Experimental support for Web Socket

# 0.1.0-rc.6 - 16 Dec 2022
Feature:
- Auto convert number, boolean on client

# 0.1.0-rc.4 - 16 Dec 2022
Feature:
- Using `vite` for bundling

# 0.1.0-rc.3 - 13 Dec 2022
Bug fix:
- Map error to `.catch`

# 0.1.0-rc.2 - 13 Dec 2022
Feature:
- Add camelCase transformation
