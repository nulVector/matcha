export const RATE_LIMIT_SCRIPT = `
  local current = redis.call('INCR',KEYS[1])
  if tonumber(current) == 1 then
    redis.call('EXPIRE',KEYS[1],ARGV[1])
  end
  return current
`;

export const REMOVE_SOCKET_SCRIPT = `
  local userId = redis.call('GET', KEYS[1])
  if not userId then
    return 0
  end
  redis.call('SREM', 'user:sockets:' .. userId, ARGV[1])
  redis.call('DEL', KEYS[1])
  return redis.call('SCARD', 'user:sockets:' .. userId)
`;