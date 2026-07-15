package com.vivrecon.api

import com.vivrecon.dto.AiChatRequest
import com.vivrecon.dto.AiChatResponse
import com.vivrecon.service.AiService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/ai")
class AiController(private val aiService: AiService) {

    @PostMapping("/chat")
    fun chat(@RequestBody req: AiChatRequest): ResponseEntity<AiChatResponse> =
        ResponseEntity.ok(AiChatResponse(aiService.chat(currentUserId(), req.message)))
}
