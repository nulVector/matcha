export const getDeterministicIds = (id1: string,id2: string): [string, string] => {
  return id1 < id2 
  ? [id1, id2] 
  : [id2, id1];
};