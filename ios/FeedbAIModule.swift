import ExpoModulesCore

public class FeedbAIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FeedbAI")

    Events("onChange")

    Constant("PI") {
      Double.pi
    }

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }

    View(FeedbAIView.self) {
      Events("onTap")
    }

    Class(FeedbAIModuleSharedObject.self) {
      Constructor { () -> FeedbAIModuleSharedObject in
        return FeedbAIModuleSharedObject()
      }

      Property("count") { (ref: FeedbAIModuleSharedObject) -> Int in
        return ref.count
      }
      .set { (ref: FeedbAIModuleSharedObject, count: Int) in
        ref.count = count
      }
    }
  }
}
