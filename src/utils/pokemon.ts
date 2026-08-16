import type { PokemonMaster } from '../types'
import pokemonMasterData from '../data/pokemonMaster.json'

export const POKEMON_MASTER: PokemonMaster[] = pokemonMasterData as PokemonMaster[]

const masterById = new Map(POKEMON_MASTER.map((p) => [p.id, p]))

export function getPokemon(id: string): PokemonMaster | undefined {
  return masterById.get(id)
}

export function displayName(pokemon: PokemonMaster): string {
  return pokemon.formName ? `${pokemon.name}(${pokemon.formName})` : pokemon.name
}

/** 一覧表示用のポケモン画像URL(PokéAPIの公開スプライトリポジトリを参照) */
export function spriteUrl(pokemon: PokemonMaster): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.spriteId}.png`
}

export function searchPokemon(query: string): PokemonMaster[] {
  const q = query.trim()
  if (!q) return POKEMON_MASTER.slice(0, 30)
  const qNum = Number(q)
  return POKEMON_MASTER.filter((p) => {
    if (!Number.isNaN(qNum) && qNum > 0) {
      if (p.nationalNo === qNum) return true
    }
    return p.name.includes(q) || displayName(p).includes(q)
  }).slice(0, 30)
}

/** そのゲームタイトルに登場(内定)するポケモンかどうか */
export function isAvailableInTitle(pokemon: PokemonMaster, title: string): boolean {
  return pokemon.gameTitles.includes(title)
}

/** マスタに実在するゲームタイトルの一覧(絞り込みの選択肢用) */
export function allGameTitles(): string[] {
  const set = new Set<string>()
  for (const p of POKEMON_MASTER) {
    for (const t of p.gameTitles) set.add(t)
  }
  return [...set].sort()
}
