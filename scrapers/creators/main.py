#!/usr/bin/env python3
"""
Script to upsert creators from a YAML file to the API.

Usage:
    python main.py [--yaml-file creators.yaml] [--api-url http://localhost:3000] [--api-key YOUR_KEY]

Environment variables:
    INTERNAL_API_KEY: API key for authentication (required if not passed as argument)
    API_URL: Base URL of the API (defaults to http://localhost:3000)
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import fire
import requests
import yaml


class CreatorUpserter:
    """Handles upserting creators from YAML to the API."""

    def __init__(self, api_url: str, api_key: str):
        """
        Initialize the upserter.

        Args:
            api_url: Base URL of the API (e.g., http://localhost:3000)
            api_key: API key for authentication
        """
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.endpoint = f"{self.api_url}/api/v1/creators"

    def load_yaml(self, yaml_file: str) -> Dict[str, Any]:
        """
        Load creators from YAML file.

        Args:
            yaml_file: Path to the YAML file

        Returns:
            Dictionary of creators
        """
        yaml_path = Path(yaml_file)
        if not yaml_path.exists():
            raise FileNotFoundError(f"YAML file not found: {yaml_file}")

        with open(yaml_path, "r") as f:
            data = yaml.safe_load(f)

        if not data:
            raise ValueError("YAML file is empty or invalid")

        return data

    def transform_creator(self, username: str, creator_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform creator data from YAML format to API format.

        Args:
            username: Username (from YAML key)
            creator_data: Creator data from YAML

        Returns:
            Transformed data ready for API
        """
        # Map YAML snake_case to API camelCase
        transformed = {
            "username": username,
            "displayName": creator_data.get("display_name"),
            "aliases": creator_data.get("aliases", []),
            "links": creator_data.get("links", []),
        }

        # Optional fields
        if "image" in creator_data:
            transformed["image"] = creator_data["image"]

        if "birthday" in creator_data:
            birthday = creator_data["birthday"]
            # Convert date object to string if needed (YAML auto-parses dates)
            if hasattr(birthday, "isoformat"):
                transformed["birthday"] = birthday.isoformat()
            else:
                transformed["birthday"] = str(birthday)

        return transformed

    def upsert_creator(self, creator_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upsert a single creator via API.

        Args:
            creator_data: Creator data in API format

        Returns:
            API response data
        """
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

        response = requests.post(
            self.endpoint,
            json=creator_data,
            headers=headers,
            timeout=30,
        )

        response.raise_for_status()
        return response.json()

    def upsert_all(self, yaml_file: str, verbose: bool = True) -> None:
        """
        Upsert all creators from YAML file.

        Args:
            yaml_file: Path to the YAML file
            verbose: Whether to print detailed output
        """
        # Load creators from YAML
        if verbose:
            print(f"📖 Loading creators from {yaml_file}")

        creators = self.load_yaml(yaml_file)

        if verbose:
            print(f"✓ Found {len(creators)} creator(s)")
            print()

        # Process each creator
        success_count = 0
        error_count = 0

        for creator_key, creator_data in creators.items():
            username = creator_key

            try:
                # Transform and upsert
                transformed = self.transform_creator(username, creator_data)
                result = self.upsert_creator(transformed)

                # Report success
                action = result.get("action", "unknown")
                success_count += 1

                if verbose:
                    print(f"✓ {username}: {action}")

            except requests.exceptions.HTTPError as e:
                error_count += 1
                if verbose:
                    print(f"✗ {username}: HTTP error - {e.response.status_code}")
                    try:
                        error_data = e.response.json()
                        print(f"  Error: {error_data.get('error', 'Unknown error')}")
                        if "details" in error_data:
                            print(f"  Details: {error_data['details']}")
                    except Exception:
                        print(f"  Response: {e.response.text}")

            except Exception as e:
                error_count += 1
                if verbose:
                    print(f"✗ {username}: {type(e).__name__} - {str(e)}")

        # Final summary
        if verbose:
            print()
            print("─" * 50)
            print(f"Summary: {success_count} succeeded, {error_count} failed")

        # Exit with error code if any failed
        if error_count > 0:
            sys.exit(1)


def main(
    yaml_file: Optional[str] = None,
    api_url: Optional[str] = None,
    api_key: Optional[str] = None,
    verbose: bool = True,
):
    """
    Main entry point for the script.

    Args:
        yaml_file: Path to the YAML file (default: creators.yaml in script directory)
        api_url: Base URL of the API (default: from API_URL env or http://localhost:3000)
        api_key: API key for authentication (default: from INTERNAL_API_KEY env)
        verbose: Whether to print detailed output (default: True)
    """
    # Default YAML file to script directory if not provided
    if yaml_file is None:
        script_dir = Path(__file__).parent
        yaml_file = str(script_dir / "creators.yaml")
    
    # Get API URL from argument or environment
    if api_url is None:
        api_url = os.environ.get("API_URL", "http://localhost:3000")

    # Get API key from argument or environment
    if api_key is None:
        api_key = os.environ.get("INTERNAL_API_KEY")

    if not api_key:
        print("Error: API key is required. Set INTERNAL_API_KEY environment variable or pass --api-key", file=sys.stderr)
        sys.exit(1)

    # Create upserter and run
    upserter = CreatorUpserter(api_url=api_url, api_key=api_key)
    upserter.upsert_all(yaml_file=yaml_file, verbose=verbose)


if __name__ == "__main__":
    fire.Fire(main)

