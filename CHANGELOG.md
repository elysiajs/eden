# 0.5.1 - 15 May 2023
Bug fix:
- fix(treaty): type not found
- fix(treaty): query not infers type

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
