package com.vivrecon

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class VivreconApplication

fun main(args: Array<String>) {
    runApplication<VivreconApplication>(*args)
}
