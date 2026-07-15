package com.vivrecon.api

import com.vivrecon.dto.CategoryResponse
import com.vivrecon.dto.CreateCategoryRequest
import com.vivrecon.service.UserCategoryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/categories")
class UserCategoryController(private val categoryService: UserCategoryService) {

    @GetMapping
    fun list(): ResponseEntity<List<CategoryResponse>> =
        ResponseEntity.ok(categoryService.list(currentUserId()))

    @PostMapping
    fun create(@RequestBody req: CreateCategoryRequest): ResponseEntity<CategoryResponse> =
        ResponseEntity.ok(categoryService.create(currentUserId(), req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        categoryService.delete(currentUserId(), id)
        return ResponseEntity.noContent().build()
    }
}
