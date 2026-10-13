package com.vivrecon.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.LocalDate

@Service
class AiService(
    @Value("\${GEMINI_API_KEY:}") private val apiKey: String,
    @Value("\${vivrecon.ai.model:gemini-2.5-flash}") private val model: String,
    private val budgetService: BudgetService,
    private val objectMapper: ObjectMapper
) {
    private val http: HttpClient = HttpClient.newHttpClient()

    fun chat(userId: Long, message: String): String {
        if (apiKey.isBlank()) {
            throw IllegalStateException("AI assistant is not configured. Set GEMINI_API_KEY on the server.")
        }
        require(message.isNotBlank()) { "Message is required" }

        val prompt = buildString {
            appendLine("You are a friendly personal-finance assistant inside a budgeting app.")
            appendLine("Give short, specific, practical answers based on the user's data below.")
            appendLine("Do not give definitive financial or legal advice; suggest, don't instruct.")
            appendLine()
            appendLine(financialContext(userId))
            appendLine()
            append("User question: ").append(message)
        }

        val requestBody = objectMapper.writeValueAsString(
            mapOf("contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))))
        )

        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            throw IllegalStateException("AI service error (${response.statusCode()}). Please try again.")
        }

        val root = objectMapper.readTree(response.body())
        val text = root.path("candidates").firstOrNull()
            ?.path("content")?.path("parts")?.firstOrNull()
            ?.path("text")?.asText()
        return text?.takeIf { it.isNotBlank() } ?: "Sorry, I couldn't come up with an answer."
    }

    /** Reads a shop receipt photo and returns its product lines as name + price. */
    fun readReceipt(imageBase64: String, mimeType: String): Map<String, Any?> {
        if (apiKey.isBlank()) throw IllegalStateException("Receipt reading is not configured. Set GEMINI_API_KEY on the server.")
        require(imageBase64.isNotBlank() && imageBase64.length < 10_000_000) { "Image missing or too large" }
        require(mimeType.startsWith("image/")) { "Not an image" }
        val prompt = "This is a photo of a shop receipt (often Estonian). Read it carefully and return ONLY JSON: " +
            "{\"shop\":\"Selver\",\"date\":\"2026-10-13\",\"total\":23.45,\"items\":[{\"name\":\"Piim 2.5%\",\"price\":1.29}]}. " +
            "shop = store name, date = purchase date (YYYY-MM-DD), total = amount paid in euros, " +
            "items = EVERY purchased product line with its line total (after line discounts). " +
            "Do not put totals, VAT, payment or change lines into items. Use null for anything you cannot read."
        val body = objectMapper.writeValueAsString(mapOf(
            "contents" to listOf(mapOf("parts" to listOf(
                mapOf("inline_data" to mapOf("mime_type" to mimeType, "data" to imageBase64)),
                mapOf("text" to prompt)))),
            "generationConfig" to mapOf("responseMimeType" to "application/json")))
        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) throw IllegalStateException("AI service error (${response.statusCode()}). Please try again.")
        val text = objectMapper.readTree(response.body()).path("candidates").firstOrNull()
            ?.path("content")?.path("parts")?.firstOrNull()?.path("text")?.asText() ?: return mapOf("items" to emptyList<Any>())
        val r = try { objectMapper.readTree(text) } catch (e: Exception) { return mapOf("items" to emptyList<Any>()) }
        val items = r.path("items").filter { it.path("name").asText().isNotBlank() && it.path("price").isNumber }
            .map { mapOf("name" to it.path("name").asText(), "price" to it.path("price").asDouble()) }
        return mapOf(
            "shop" to r.path("shop").asText("").takeIf { it.isNotBlank() && it != "null" },
            "date" to r.path("date").asText("").takeIf { Regex("""\d{4}-\d{2}-\d{2}""").matches(it) },
            "total" to r.path("total").takeIf { it.isNumber }?.asDouble(),
            "items" to items,
        )
    }

    /** A compact summary of the current month so answers are personalised. */
    private fun financialContext(userId: Long): String {
        val ym = LocalDate.now().toString().substring(0, 7)
        val b = budgetService.getOrCreateBudget(userId, ym)
        val byCategory = b.expenseLines
            .groupBy { it.category ?: "OTHER" }
            .mapValues { (_, lines) -> lines.sumOf { it.amount } }
            .entries.sortedByDescending { it.value }
            .joinToString(", ") { "${it.key}: ${it.value}" }

        return buildString {
            appendLine("This month ($ym):")
            appendLine("- Total income: ${b.totalIncome}")
            appendLine("- Total expenses: ${b.totalExpenses}")
            appendLine("- Balance: ${b.balance}")
            if (byCategory.isNotBlank()) appendLine("- Spending by category: $byCategory")
        }
    }
}
