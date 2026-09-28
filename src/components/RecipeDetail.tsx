import type { Recipe } from '../api/recipes'
import { RecipeMeta } from './RecipeMeta'

interface RecipeDetailProps {
  recipe: Recipe
}

// ingredients and preparation are HTML produced by Wagtail's rich text
// editor, which only lets editors enter whitelisted markup.
export function RecipeDetail({ recipe }: RecipeDetailProps) {
  return (
    <article className="recipe-detail">
      <a href="#" className="recipe-back">
        ← All recipes
      </a>
      <h2>{recipe.title}</h2>
      <RecipeMeta recipe={recipe} />
      {recipe.ingredients && (
        <section>
          <h3>Ingredients</h3>
          <div dangerouslySetInnerHTML={{ __html: recipe.ingredients }} />
        </section>
      )}
      {recipe.preparation && (
        <section>
          <h3>Preparation</h3>
          <div dangerouslySetInnerHTML={{ __html: recipe.preparation }} />
        </section>
      )}
    </article>
  )
}
