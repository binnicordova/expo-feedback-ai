package ai.feedb

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FeedbAIModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FeedbAI")

    Events("onChange")

    Constant("PI") {
      Math.PI
    }

    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { value: String ->
      sendEvent("onChange", mapOf(
        "value" to value
      ))
    }

    View(FeedbAIView::class) {
      // Defines an event that the view can send to JavaScript.
      Events("onTap")
    }

    Class(FeedbAIModuleSharedObject::class) {
      Constructor {
        val instance = FeedbAIModuleSharedObject(appContext)
        return@Constructor instance
      }

      Property("count")
        .get { ref: FeedbAIModuleSharedObject ->
          ref.count
        }
        .set { ref: FeedbAIModuleSharedObject, count: Int ->
          ref.count = count
        }
    }
  }
}
