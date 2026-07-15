package com.vivrecon.service

import com.vivrecon.domain.CategoryKind
import com.vivrecon.domain.UserCategoryEntity
import com.vivrecon.dto.CategoryResponse
import com.vivrecon.dto.CreateCategoryRequest
import com.vivrecon.repo.UserCategoryRepository
import com.vivrecon.repo.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserCategoryService(
    private val categoryRepo: UserCategoryRepository,
    private val userRepo: UserRepository
) {

    fun list(userId: Long): List<CategoryResponse> =
        categoryRepo.findAllByUserIdOrderByCreatedAtAsc(userId).map { it.toDto() }

    @Transactional
    fun create(userId: Long, req: CreateCategoryRequest): CategoryResponse {
        require(req.name.isNotBlank()) { "Name is required" }
        val kind = runCatching { CategoryKind.valueOf(req.kind.uppercase()) }
            .getOrElse { throw IllegalArgumentException("Kind must be INCOME or EXPENSE") }

        // A subcategory must point to one of the user's own top-level categories.
        req.parentId?.let { pid ->
            val parent = categoryRepo.findByIdAndUserId(pid, userId)
                .orElseThrow { NoSuchElementException("Parent category not found") }
            require(parent.parentId == null) { "Subcategories can only be one level deep" }
        }

        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        return categoryRepo.save(
            UserCategoryEntity(user = user, name = req.name.trim(), kind = kind, parentId = req.parentId)
        ).toDto()
    }

    /** Deleting a top-level category also removes its subcategories. */
    @Transactional
    fun delete(userId: Long, id: Long) {
        val category = categoryRepo.findByIdAndUserId(id, userId)
            .orElseThrow { NoSuchElementException("Category not found") }
        categoryRepo.deleteAllByParentId(category.id)
        categoryRepo.delete(category)
    }

    private fun UserCategoryEntity.toDto() = CategoryResponse(id, name, kind.name, parentId)
}
