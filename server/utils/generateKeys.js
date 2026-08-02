export const generateKey=(days=30)=>{const part=()=>Math.random().toString(36).slice(2,6).toUpperCase();return `TRIV-${part()}-${part()}-${days}D`;};
