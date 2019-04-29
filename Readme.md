# Frontend WeSocket interface for Zox.js GraphQL endpoint

Connect using a single line of code.  
WeSocket will auto-reconnect if connection breaks.

```js
const gql = new GraphQLWebSocket();
const gql = new GraphQLWebSocket('ws://localhost:8080/graphql');
```

Subscribe to any number of event feeds.

```js
var sid = gql.subscribe({id:'subscription-id'}, event => console.log(event));
```

Unsubscribe using the returned subscription id.

```js
gql.unsubscribe(sid);
```

Execute Queries and Mutations over the same connection.

```js
gql.query({id:'query-id'}, event => console.log(event));
const event = gql.queryAsync({id:'query-id'});
```

### Options:

```yaml
query: Send raw GraphQL Query
id: Execute a predefined Query by it's ID
op: Operation name - used when the Query contains multiple operations
vars: Variables
```
