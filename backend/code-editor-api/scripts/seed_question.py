import json
import boto3
from pathlib import Path


# =========================================================
# AWS CONFIGURATION
# =========================================================

AWS_REGION = "ap-south-1"

TABLE_NAME = "live-code-editor-questions"


# =========================================================
# FILE CONFIGURATION
# =========================================================

# Current file:
#
# backend/code-editor-api/scripts/seed_question.py
#
# Parent:
#
# backend/code-editor-api/scripts
#
# Parent.parent:
#
# backend/code-editor-api
#
# Our questions.json is now directly inside:
#
# backend/code-editor-api/questions.json

BASE_DIR = Path(__file__).resolve().parent.parent

QUESTIONS_FILE = BASE_DIR / "questions.json"


# =========================================================
# CONNECT TO DYNAMODB
# =========================================================

dynamodb = boto3.resource(
    "dynamodb",
    region_name=AWS_REGION
)

table = dynamodb.Table(TABLE_NAME)


# =========================================================
# LOAD QUESTIONS FROM JSON
# =========================================================

def load_questions():

    print()
    print("Loading questions from:")
    print(QUESTIONS_FILE)
    print()

    if not QUESTIONS_FILE.exists():

        raise FileNotFoundError(
            f"questions.json was not found at: {QUESTIONS_FILE}"
        )

    with open(
        QUESTIONS_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        questions = json.load(file)

    if not isinstance(questions, list):

        raise ValueError(
            "questions.json must contain a JSON array."
        )

    if len(questions) == 0:

        raise ValueError(
            "questions.json does not contain any questions."
        )

    return questions


# =========================================================
# VALIDATE QUESTION
# =========================================================

def validate_question(question):

    required_fields = [
        "questionId",
        "title",
        "description",
        "difficulty",
        "languages",
        "starterCode",
        "functionSignature",
        "questionType",
        "testCases"
    ]

    # -----------------------------------------------------
    # Check required fields
    # -----------------------------------------------------

    for field in required_fields:

        if field not in question:

            raise ValueError(
                f"Missing required field '{field}' "
                f"for question "
                f"'{question.get('questionId', 'unknown')}'"
            )

    # -----------------------------------------------------
    # Check question ID
    # -----------------------------------------------------

    if not isinstance(
        question["questionId"],
        str
    ) or not question["questionId"].strip():

        raise ValueError(
            "questionId must be a non-empty string for "
            f"question '{question['questionId']}'"
        )

    # -----------------------------------------------------
    # Check languages
    # -----------------------------------------------------

    if not isinstance(
        question["languages"],
        list
    ):

        raise ValueError(
            "'languages' must be a list for "
            f"question '{question['questionId']}'"
        )

    if len(question["languages"]) == 0:

        raise ValueError(
            f"Question '{question['questionId']}' "
            "must support at least one language."
        )

    # -----------------------------------------------------
    # Check starter code
    # -----------------------------------------------------

    if not isinstance(
        question["starterCode"],
        dict
    ):

        raise ValueError(
            "'starterCode' must be an object for "
            f"question '{question['questionId']}'"
        )

    for language in question["languages"]:

        if language not in question["starterCode"]:

            raise ValueError(
                f"Missing starter code for '{language}' "
                f"in question '{question['questionId']}'"
            )

    # -----------------------------------------------------
    # Check function signatures
    # -----------------------------------------------------

    if not isinstance(
        question["functionSignature"],
        dict
    ):

        raise ValueError(
            "'functionSignature' must be an object for "
            f"question '{question['questionId']}'"
        )

    for language in question["languages"]:

        if language not in question["functionSignature"]:

            raise ValueError(
                f"Missing function signature for '{language}' "
                f"in question '{question['questionId']}'"
            )

    # -----------------------------------------------------
    # Check test cases
    # -----------------------------------------------------

    if not isinstance(
        question["testCases"],
        list
    ):

        raise ValueError(
            "'testCases' must be a list for "
            f"question '{question['questionId']}'"
        )

    # -----------------------------------------------------
    # Every question must have at least 4 test cases
    # -----------------------------------------------------

    if len(question["testCases"]) < 4:

        raise ValueError(
            f"Question '{question['questionId']}' "
            "must contain at least 4 test cases."
        )

    # -----------------------------------------------------
    # Check test case structure
    # -----------------------------------------------------

    for test_case in question["testCases"]:

        if not isinstance(
            test_case,
            dict
        ):

            raise ValueError(
                f"Every test case must be an object in "
                f"question '{question['questionId']}'"
            )

        if "id" not in test_case:

            raise ValueError(
                f"Test case is missing 'id' in "
                f"question '{question['questionId']}'"
            )

        if "input" not in test_case:

            raise ValueError(
                f"Test case {test_case['id']} is missing "
                f"'input' in question "
                f"'{question['questionId']}'"
            )

        if "expectedOutput" not in test_case:

            raise ValueError(
                f"Test case {test_case['id']} is missing "
                f"'expectedOutput' in question "
                f"'{question['questionId']}'"
            )

    # -----------------------------------------------------
    # Check Java execution configuration
    #
    # Some questions have explicit execution configuration.
    #
    # If execution is not present, the backend can derive
    # the Java execution information automatically.
    # -----------------------------------------------------

    if "java" in question["languages"]:

        if "execution" in question:

            execution = question["execution"]

            # -------------------------------------------------
            # execution must be a dictionary
            # -------------------------------------------------

            if not isinstance(
                execution,
                dict
            ):

                raise ValueError(
                    "'execution' must be an object for "
                    f"question '{question['questionId']}'"
                )

            execution_fields = [
                "methodName",
                "parameterTypes",
                "inputFields",
                "returnType"
            ]

            # -------------------------------------------------
            # Check required execution fields
            # -------------------------------------------------

            for field in execution_fields:

                if field not in execution:

                    raise ValueError(
                        f"Missing execution field '{field}' "
                        f"for question "
                        f"'{question['questionId']}'"
                    )

            # -------------------------------------------------
            # parameterTypes must be a list
            # -------------------------------------------------

            if not isinstance(
                execution["parameterTypes"],
                list
            ):

                raise ValueError(
                    "'parameterTypes' must be a list for "
                    f"question '{question['questionId']}'"
                )

            # -------------------------------------------------
            # inputFields must be a list
            # -------------------------------------------------

            if not isinstance(
                execution["inputFields"],
                list
            ):

                raise ValueError(
                    "'inputFields' must be a list for "
                    f"question '{question['questionId']}'"
                )

            # -------------------------------------------------
            # Number of parameter types must match
            # number of input fields
            # -------------------------------------------------

            if len(
                execution["parameterTypes"]
            ) != len(
                execution["inputFields"]
            ):

                raise ValueError(
                    "Java parameterTypes and inputFields "
                    "length mismatch for question "
                    f"'{question['questionId']}'"
                )

        else:

            print(
                "  ℹ Java execution will be derived automatically: "
                f"{question['questionId']}"
            )


# =========================================================
# SEED QUESTIONS
# =========================================================

def seed_questions():

    print()
    print("================================================")
    print("     LIVE CODE EDITOR - QUESTION SEEDER")
    print("================================================")
    print()

    print("AWS Region :", AWS_REGION)
    print("DynamoDB   :", TABLE_NAME)

    # -----------------------------------------------------
    # STEP 1: Load questions from JSON
    # -----------------------------------------------------

    try:

        questions = load_questions()

        print(
            "Questions  :", 
            len(questions)
        )

        print()

        # -------------------------------------------------
        # STEP 2: Validate all questions
        # -------------------------------------------------

        print("Validating questions...")
        print()

        # Check for duplicate question IDs

        question_ids = set()

        for question in questions:

            question_id = question.get("questionId")

            if question_id in question_ids:

                raise ValueError(
                    f"Duplicate questionId found: "
                    f"'{question_id}'"
                )

            question_ids.add(question_id)

            validate_question(question)

            print(
                f"✓ Validated: "
                f"{question['questionId']} "
                f"→ {question['title']}"
            )

        print()

        print("All questions passed validation.")
        print()

        # -------------------------------------------------
        # STEP 3: Upload all questions
        # -------------------------------------------------

        print("Uploading questions to DynamoDB...")
        print()

        with table.batch_writer() as batch:

            for question in questions:

                batch.put_item(
                    Item=question
                )

                print(
                    f"✓ Uploaded: "
                    f"{question['questionId']} "
                    f"→ {question['title']}"
                )

        # -------------------------------------------------
        # STEP 4: Success message
        # -------------------------------------------------

        print()

        print("================================================")
        print("     QUESTIONS UPLOADED SUCCESSFULLY")
        print("================================================")

        print()

        print(
            f"Total questions uploaded: "
            f"{len(questions)}"
        )

        print()

        for question in questions:

            print(
                f"ID         : "
                f"{question['questionId']}"
            )

            print(
                f"Title      : "
                f"{question['title']}"
            )

            print(
                f"Difficulty : "
                f"{question['difficulty']}"
            )

            print(
                f"Languages  : "
                f"{question['languages']}"
            )

            print(
                f"Test Cases : "
                f"{len(question['testCases'])}"
            )

            print(
                "-----------------------------------------------"
            )

        print()

    except Exception as error:

        print()

        print("================================================")
        print("       FAILED TO UPLOAD QUESTIONS")
        print("================================================")

        print()

        print(
            "Error:",
            str(error)
        )

        print()


# =========================================================
# PROGRAM ENTRY POINT
# =========================================================

if __name__ == "__main__":

    seed_questions()